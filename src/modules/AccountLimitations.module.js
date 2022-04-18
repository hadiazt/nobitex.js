const axios = require('axios');
const { Base, Paths } = require('../config.json')
module.exports = ({ token }) => {
    const config = {
        method: 'post',
        url: Base + Paths.User + '/limitations',
        headers: {
            Authorization: `Token ${token}`,
        },
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data;
            resolve(req)
        }).catch(e => { console.log(e) });
    });
}