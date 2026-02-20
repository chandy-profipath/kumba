const express = require('express');
const { Paynow } = require('paynow');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Health check
app.get('/', (req, res) => {
    res.send('Paynow Server is running!');
});

const paynow = new Paynow(
    process.env.PAYNOW_INTEGRATION_ID ? process.env.PAYNOW_INTEGRATION_ID.trim() : '',
    process.env.PAYNOW_INTEGRATION_KEY ? process.env.PAYNOW_INTEGRATION_KEY.trim() : '',
    process.env.PAYNOW_RESULT_URL,
    process.env.PAYNOW_RETURN_URL
);

app.post('/pay', async (req, res) => {
    console.log('Received payment request:', req.body);
    const { description, mobile, amount, authemail } = req.body;

    if (!description || !mobile || !amount || !authemail) {
        return res.status(400).json({ error: 'Missing required fields: description, mobile, amount, authemail' });
    }

    try {
        const payment = paynow.createPayment(description, authemail);
        payment.add(description, amount);

        const response = await paynow.sendMobile(payment, mobile, 'ecocash');

        if (response.success) {
            res.json({
                success: true,
                pollUrl: response.pollUrl,
                instructions: response.instructions || 'Please enter your PIN on your mobile device.'
            });
        } else {
            console.log('Paynow Rejected:', response.error);
            res.status(400).json({
                success: false,
                error: response.error
            });
        }
    } catch (error) {
        console.error('Paynow Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to check transaction status
app.get('/status', async (req, res) => {
    const { pollUrl } = req.query;

    if (!pollUrl) {
        return res.status(400).json({ error: 'Missing pollUrl' });
    }

    try {
        const status = await paynow.pollTransactionStatus(pollUrl);
        res.json(status);
    } catch (error) {
        console.error('Status Error:', error);
        res.status(500).json({ error: 'Error polling status' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Paynow server running on port ${PORT}`);
});
