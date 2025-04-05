# Sample DEX Project
Currently hardcoded for the USDC/WBTC

Will require the .env file to be populated
```
PRIVATE_KEY=
NETWORK_URL=YOUR_BUILDBEAR_NETWORK
```

Deploy the contract
```
npx hardhat run scripts/deploy.js --network buildbear
```

Get a quote
```
npx hardhat run scripts/quote.js --network buildbear
```
