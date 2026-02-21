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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { pollUrl } = req.query;
    if (!pollUrl) {
        return res.status(400).json({ error: 'Missing pollUrl' });
    }

    try {
        const status = await paynow.pollTransaction(pollUrl);
        return res.json(status);
    } catch (error) {
        return res.status(500).json({ error: 'Error polling status', message: error.message });
    }
};
