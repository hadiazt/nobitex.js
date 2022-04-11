const nobitex = require('./src/main')

nobitex.price({type:''}).then(res => console.log(res))