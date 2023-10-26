const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@car-doctor.a5k2qws.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();

        const serviceCollection = client.db('CarDoctor').collection('services');
        const checkoutCollection = client.db('CarDoctor').collection('checkout');

        // view all services
        app.get('/services', async (req, res) => {
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
        app.get('/checkout', async (req, res) => {
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
