const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@car-doctor.a5k2qws.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// middle wares -> self made
const logger = async (req, res, next) => {
    console.log('called', req.host, req.originalUrl);
    next()
}
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('value of token in the middleware', token);
    if (!token) {
        return res.status(401).send({ message: 'not authorized' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        //error
        if (err) {
            console.log(err);
            return res.status(401).send({ message: 'unauthorized' })
        }
        //if token is valid then it would be decoded
        console.log('value in the token', decoded);
        req.user = decoded;
        next()
    })
    
}


async function run() {
    try {
        await client.connect();

        const serviceCollection = client.db('CarDoctor').collection('services');
        const checkoutCollection = client.db('CarDoctor').collection('checkout');


        // auth related api
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,  //http://localhost:5173/login
                })
                .send({ success: true });
        });

        // to ganarate secret
        // in terminal 
        // 1. node
        // 2.  require('crypto').randomBytes(64).toString('hex')


        // services related api

        // view all services
        app.get('/services', logger, async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        // view an individual service
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };

            const options = { projection: { title: 1, price: 1, service_id: 1, img: 1 } };
            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        });


        // Checkout
        app.get('/checkout', logger, verifyToken, async (req, res) => {
            console.log(req.query.email);
            // console.log('tok tok token', req.cookies.token);
            if (req.query.email !== req.user.email) {
                return res.status(403).send({message: 'forbidden access'})
            }

            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email };
            }
            const result = await checkoutCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/checkout', async (req, res) => {
            const newCheckout = req.body;
            const result = await checkoutCollection.insertOne(newCheckout);
            res.send(result);
        });

        app.patch('/checkout/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateCheckout = req.body;
            console.log(updateCheckout);
            const updateDoc = {
                $set: {
                    status: updateCheckout.status
                }
            };

            const result = await checkoutCollection.updateOne(filter, updateDoc);
            res.send(result);
        });



        app.delete('/checkout/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await checkoutCollection.deleteOne(query);
            res.send(result);
        })

        await client.db('admin').command({ ping: 1 });
        console.log('Pinged your deployment. You successfully connected to MongoDB!');
    } finally {
        // Ensure that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Car Doctor Server is Running');
});

app.listen(port, () => {
    console.log(`Car Doctor Server is Running on Port ${port}`);
});
