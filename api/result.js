module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Paynow sends the payment result here as form data
    const body = req.body;
    console.log('Paynow result callback:', body);

    // You can save the result to a database here
    // e.g. update order status based on body.reference and body.status

    return res.status(200).send('OK');
};
