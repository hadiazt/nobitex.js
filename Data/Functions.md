<h1 align="center">Market Information (General)</h1>

<h2>Price :</h2>

```js
const nobitex = require('nobitex.js')
nobitex.price({ type: '' }).then(res => console.log(res))
```
<h6>Type <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--price--trade-functions--">Objects</a></h6>
<h2>Trades :</h2>

```js
const nobitex = require('nobitex.js')
nobitex.trades({ type: '' }).then(res => console.log(res))
```
<h6>Type <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--price--trade-functions--">Objects</a></h6>


<h2>Market :</h2>

```js
const nobitex = require('nobitex.js')
nobitex.market({ from: '', to: '' }).then(res => console.log(res))
```
<h6>From & To <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--market-function--">Objects</a></h6>

<h2>Global : </h2>

```js
const nobitex = require('nobitex.js')
nobitex.global().then(res => console.log(res))
```
<h1 align="center">Trading In The Market
</h1>
SOON . . .
<h1 align="center">User Information</h1>

<h2>Account : </h2>

```js
const nobitex = require('nobitex.js')
nobitex.account({ token: '' }).then(res => console.log(res))
```
<h6>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h6>

<h2>CreateWallet : </h2>

```js
const nobitex = require('nobitex.js')
nobitex.CreateWallet({ token: '', type: '' }).then(res => console.log(res))
```
<h6>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h6>
<h6>Type <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--createwallet-function--">Objects</a></h6>

<h2> AddCard : </h2>

```js
const nobitex = require('nobitex.js')
nobitex.AddCard({ token: '', CardNumber: '', BankName: '' }).then(res => console.log(res))
```
<h6>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h6>
<h6>CardNumber : Your Card Number Witout Space </h6>
<h6>BankName : Your Card Bank Name In Persian Format </h6>

<h2> AddBankAccount : </h2>

```js
const nobitex = require('nobitex.js')
nobitex.AddBankAccount({ token: '', CardNumber: '', Shaba: '', CardName: '' }).then(res => console.log(res))
```


<h2> AccountLimitations : </h2>

```js
const nobitex = require('nobitex.js')
nobitex.AccountLimitations({ token: '' }).then(res => console.log(res))
```
<h1 align="center">User financial information</h1>

```js
const nobitex = require('nobitex.js')
nobitex.AccountWallets({ token: '' }).then(res => console.log(res))
```
```js
const nobitex = require('nobitex.js')
nobitex.AccountBalance({ token:'' , type: '' }).then(res => console.log(res))
```

<h1 align="center">Security</h1>
SOON . . .


<h5>Token : </h5>
<h6>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h6>
<h5>CardNumber : </h5>
<h6>Your Card Number Witout Space </h6>
<h5>BankName : </h5>
<h6>Your Card Bank Name In Persian Format</h6>
<h5>Shaba : </h5>
<h6>Your Card Account <a href="https://www.ibena.ir/news/123905/%DA%A9%D8%AF-%D8%B4%D8%A8%D8%A7-%DA%86%DB%8C%D8%B3%D8%AA-%D9%88-%DA%86%D9%87-%DA%A9%D8%A7%D8%A8%D8%B1%D8%AF%DB%8C-%D8%AF%D8%A7%D8%B1%D8%AF">Shaba</a> Number </h6>
