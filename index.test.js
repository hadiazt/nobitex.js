const nobitex = require('./src/main') 
// const nobitex = require(nobitex.js)
const { token } = require('./file.json')


// nobitex.Price({type:''}).then(res => console.log(res))
// nobitex.Trades({ type: '' }).then(res => console.log(res))
// nobitex.Market({from:'',to:''}).then(res => console.log(res))
// nobitex.Global().then(res => console.log(res))
// nobitex.Account({ token: token }).then(res => console.log(res))
nobitex.CreateWallet