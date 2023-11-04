const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

// Middleware
app.use(cors({
    origin: [
        // 'http://localhost:5173'
        'https://car-doctor-49762.web.app/',
        'https://car-doctor-49762.firebaseapp.com'
    ],
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

// middleWares
const logger = (req, res, next) => {
    console.log('log: Info', req.method, req.url);
    next();
}
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    console.log('token in the middleware', token);

    // no token available
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next()
    })
}


async function run() {
    try {
        await client.connect();

        const serviceCollection = client.db('CarDoctor').collection('services');
        const checkoutCollection = client.db('CarDoctor').collection('checkout');

        // Auth Related API
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body
            console.log('user for Token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true });
        });

        app.post('/logout', async (req, res) => {
            const user = req.body
            console.log('logging out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        });

        // Services Related API
        // view all the services
        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.clearCookie('token', { maxAge: 0 }).send(result);
        });

        // view a individual service
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };

            const options = { projection: { title: 1, price: 1, service_id: 1, img: 1 } };
            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        });

        // Checkout Related API
        // Checkout
        app.get('/checkout', logger, verifyToken, async (req, res) => {
            console.log(req.query.email);
            console.log('token user info', req.user);
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'Forbidden access' })
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
