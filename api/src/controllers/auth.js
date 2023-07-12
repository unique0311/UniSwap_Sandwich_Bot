const axios = require('axios');

const asyncHandler = require('express-async-handler');

const API_URL = "https://api.hyper.co/v5/licenses";
const API_KEY = "sk_s6CLE2wEWMoxvBC4PSHISnyi83xrPtNcqFG0qB7lddyfBZmFVvZe6b3HF8q0HD73";

exports.auth = asyncHandler(async (req, res) => {
  axios.get(`${API_URL}/${process.env.KEY}`, {
      headers: { Authorization: `Bearer ${API_KEY}`}
    })
    .then(response => {
      res.status(200).json({
        success: true,
        data: response.data
      });
    })
    .catch(error => {
      res.status(403).json({
        error: error.message
      });
    });
});
