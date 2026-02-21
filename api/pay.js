const { Paynow } = require('paynow');
require('dotenv').config();

const paynow = new Paynow(
    (process.env.PAYNOW_INTEGRATION_ID || '').trim(),
    (process.env.PAYNOW_INTEGRATION_KEY || '').trim(),
    process.env.PAYNOW_RESULT_URL,
    process.env.PAYNOW_RETURN_URL
);

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { description, mobile, amount, authemail } = req.body;

    if (!description || !mobile || !amount || !authemail) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        const payment = paynow.createPayment(description, authemail);
        payment.add(description, amount);

        const response = await paynow.sendMobile(payment, mobile, 'ecocash');

        if (response.success) {
            return res.json({
                success: true,
                pollUrl: response.pollUrl,
                instructions: response.instructions || 'Check your phone for the Ecocash prompt'
            });
        } else {
            return res.status(400).json({ success: false, error: response.error });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
};
