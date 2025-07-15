const express = require('express');
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token
    if (!token) {
        return res.send(401).send({ message: 'Unauthorized Access' })
    }
    //verify token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized Access' })
        }
        req.user = decoded
        next()
    })
}

app.get('/', (req, res) => {
    res.send('Food is Everything')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7rlpdj6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const foodCollection = client.db("foodDB").collection("foodItems")
        const userCollection = client.db("foodDB").collection("Users")
        const cartCollection = client.db("foodDB").collection("Cart")

        //auth related apis
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
            })
                .send({ success: true })
        })
        app.post('/logout', async (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: false,
            })
                .send({ success: true })
        })

        //foods related apis
        app.get('/foods', async (req, res) => {
            const cursor = foodCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.post('/foods', async (req, res) => {
            const newFood = req.body
            const result = await foodCollection.insertOne(newFood)
            res.send(result)
        })
        app.delete('/foods/:id', async (req, res) => {
            const id = req.params.id            
            const result = await foodCollection.deleteOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        //cart related apis
        app.post('/cart', async (req, res) => {
            const newCart = req.body
            const result = await cartCollection.insertOne(newCart)
            res.send(result)
        })
        app.get('/cart/:email', async (req, res) => {
            const email = req.params.email
            const cartItems = await cartCollection.find({ email: email }).toArray()
            res.send(cartItems)
        })

        //user realted apis
        app.post('/users', async (req, res) => {
            const newUser = req.body
            const result = await userCollection.insertOne(newUser)
            res.send(result)
        })


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Food is being prepared at: ${port}`)
})