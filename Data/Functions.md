<h1 align="center">📑 Market Information (General) 📑</h1>

```js
const nobitex = require('nobitex.js')
nobitex.price({ type: '' }).then(res => console.log(res))
// Will Return Few Last Trades Prices
// {
//   lastUpdate: '4/18/2022, 7:51:59 PM',
//   lastTradePrice: '11054857770',
//   buy: [
//     [ 'Price', 'Value' ],
//     [ '11009999990', '0.000377' ],
//     [ '11008003010', '0.009084' ]
//   ],
//   sell: [
//     [ 'Price', 'Value' ],
//     [ '11054857760', '0.01799' ],
//     [ '11054857770', '0.045686' ],
//     [ '11054859770', '0.001042' ],
//     [ '11054895000', '0.012043' ],
//     [ '11054900000', '0.098712' ]
//   ]
// }
```
```js
const nobitex = require('nobitex.js')
nobitex.trades({ type: '' }).then(res => console.log(res))
// Will Return Few Last Trades
// [
//   {
//     time: '4/18/2022, 7:53:33 PM',
//     price: '11008003010',
//     volume: '0.000759',
//     type: 'sell'
//   },
//   {
//     time: '4/18/2022, 7:53:33 PM',
//     price: '11009999990',
//     volume: '0.000377',
//     type: 'sell'
//   },
//   {
//     time: '4/18/2022, 7:53:26 PM',
//     price: '11009999990',
//     volume: '0.000001',
//     type: 'sell'
//   },
//   {
//     time: '4/18/2022, 7:53:14 PM',
//     price: '11010000000',
//     volume: '0.000238',
//     type: 'sell'
//   },
//   {
//     time: '4/18/2022, 7:53:14 PM',
//     price: '11010000100',
//     volume: '0.004934',
//     type: 'sell'
//    }
// ]
```
```js
const nobitex = require('nobitex.js')
nobitex.market({ from: '', to: '' }).then(res => console.log(res))
// Will Return The Selected Crypto Changes
// {
//     "isClosed":false,
//     "bestSell":"11006023000",
//     "bestBuy":"10969400000",
//     "volumeSrc":"8.19486385408",
//     "volumeDst":"90650685905.43966976244",
//     "latest":"10957107600",
//     "dayLow":"10902000000",
//     "dayHigh":"11267200000","dayOpen":"11247096890",
//     "dayClose":"10957107600",
//     "dayChange":"-2.58"
// }
```
```js
const nobitex = require('nobitex.js')
nobitex.global().then(res => console.log(res))
// Will Return All Available Cryptos Prices In USD Format
// {
//   mkr: 1754.4,
//   srm: 2.28,
//   keep: 0.6018,
//   c98: 1.4426,
//   sfp: 0.7606,
//   '1000xec': 0.08557,
//   xem: 0.0954,
//   zen: 36.523,
//   eth: 2915.87,
//   mtl: 2.9685,
//   bat: 0.7326,
//   enj: 1.3914,
//   rsr: 0.0128,
//   omg: 4.465,
//   ata: 0.3473,
//   iost: 0.02735,
//   doge: 0.13584,
//   algo: 0.7163
//   ...
// }
```
<h1 align="center">💲Trading In The Market 💲</h1>
When This Repo Get 25 ⭐️

<h1 align="center">👤 User Information 👤</h1>

```js
const nobitex = require('nobitex.js')
nobitex.account({ token: '' }).then(res => console.log(res))
// Will Return Account Info
// {
//   Account: {
//     AccountID: num,
//     Username: 'XXXXXXX@gmail.com',
//     Email: 'XXXXXX@gmail.com',
//     Level: 44
//   },
//   Personal: {
//     Firstname: 'XXXX',
//     Lastname: 'XXXXX',
//     NationalCode: '51XXX756',
//     Nickname: null,
//     Phone: null,
//     Mobile: '09939XXX357',
//     Province: null,
//     City: null,
//     Address: null
//   },
//   BankDetails: { BankCards: [ [Object] ], BankAccounts: [ [Object] ] },
//   Verifications: {
//     Email: true,
//     Phone: false,
//     Mobile: true,
//     Identity: true,
//     Selfie: false,
//     Auto_KYC: false,
//     BankAccount: true,
//     BankCard: true,
//     Address: false,
//     City: false,
//     PhoneCode: false,
//     MobileIdentity: true
//   },
//   Options: {
//     Fee: 'num',
//     FeeUSDT: 'num',
//     Discount: null,
//     IsManualFee: false,
//     TFA: true,
//     SocialLoginEnabled: true
//   },
//   Features: [ 'Portfolio', 'PriceAlert', 'StopLoss' ],
//   ChatID: '7b4bce0XXXXXXXXXXX8fab7af85',
//   WithdrawEligible: true
// }
```
```js
const nobitex = require('nobitex.js')
nobitex.CreateWallet({ token: '', type: '' }).then(res => console.log(res))
// Will Create Crypto Wallet For Selected Crypto
// {
//     "Status": "ok",
//     "Address": "LRf3vuTMy4UwD5b72G84hmkfGBQYJeTwUs"
// }
```
```js
const nobitex = require('nobitex.js')
nobitex.AddCard({ token: '', CardNumber: '', BankName: '' }).then(res => console.log(res))
// Will Add BankCard To Your Account
// {
//     "status": "ok"
// }
```
```js
const nobitex = require('nobitex.js')
nobitex.AddBankAccount({ token: '', CardNumber: '', Shaba: '', CardName: '' }).then(res => console.log
(res))
// Will Add BankAccount To Your Account
// {
//     "status": "ok"
// }
```
```js
const nobitex = require('nobitex.js')
nobitex.AccountLimitations({ token: '' }).then(res => console.log(res))
// Will Return Your Account Limitions
// {
//   "status": "ok",
//   "limitations": {
//     "userLevel": "level2",
//     "features": {
//       "crypto_trade": false,
//       "rial_trade": false,
//       "coin_deposit": false,
//       "rial_deposit": false,
//       "coin_withdrawal": false,
//       "rial_withdrawal": false
//     },
//     "limits": {
//       "withdrawRialDaily": {
//         "used": "0",
//         "limit": "900000000"
//       },
//       "withdrawCoinDaily": {
//         "used": "0",
//         "limit": "2000000000"
//       },
//       "withdrawTotalDaily": {
//         "used": "0",
//         "limit": "2000000000"
//       },
//       "withdrawTotalMonthly": {
//         "used": "0",
//         "limit": "30000000000"
//       }
//     }
//   }
// }
```
<h1 align="center">💱 User financial information 💱</h1>

```js
const nobitex = require('nobitex.js')
nobitex.AccountWallets({ token: '' }).then(res => console.log(res))
// Will Return Your Account Crypto Wallets
// [
//     {
//         "activeBalance": "10.2649975000",
//         "blockedBalance": "0",
//         "user": "name@example.com",
//         "currency": "ltc",
//         "id": 4159,
//         "balance": "10.2649975000",
//         "rialBalance": 51322935,
//         "rialBalanceSell": 52507310,
//         "depositAddress": null
//     },
//     ...
]
```
```js
const nobitex = require('nobitex.js')
nobitex.AccountBalance({ token:'' , type: '' }).then(res => console.log(res))
// Will Return Your Selected Crypto Stock
// {
//     "Balance": "10.2649975000",
// }
```

<h1 align="center">🔐 Security 🔐</h1>

```js
const nobitex = require('nobitex.js')
nobitex.LoginLog({ token }).then(res => console.log(res))
// Will Return Last Login Devices
// {
//     "status": "ok",
//     "attempts": [
//         {
//             "ip": "46.209.130.106",
//             "username": "name@example.com",
//             "status": "Successful",
//             "createdAt": "2018-11-28T14:16:08.264308+00:00"
//         },
//         ...
//     ]
// }
```
```js
const nobitex = require('nobitex.js')
nobitex.EmergencyCancel({ token }).then(res => console.log(res))
// Will Gave You A Code For EmergencyCancel
// {
//     "status": "ok",
//     "cancelCode": {
//         "code": "seJlef35L3"
//     }
// }
```

<h1 align="center">⚙️ HELP ⚙️</h1>

<h5>Price & Trade <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--price--trade-functions--">Objects</a></h5>
<h5>CreateWallet <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--createwallet-function--">Objects</a></h5>
<h5>Market (From & To) <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--market-function--">Objects</a></h5>
<h5>Token : Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h5>
<h5>CardNumber : Your Card Number Without Space </h5>
<h5>BankName : Your Card Bank Name In Persian Format</h5>
<h5>Shaba : Your Card Account <a href="https://www.ibena.ir/news/123905/%DA%A9%D8%AF-%D8%B4%D8%A8%D8%A7-%DA%86%DB%8C%D8%B3%D8%AA-%D9%88-%DA%86%D9%87-%DA%A9%D8%A7%D8%A8%D8%B1%D8%AF%DB%8C-%D8%AF%D8%A7%D8%B1%D8%AF">Shaba</a> Number </h5>
