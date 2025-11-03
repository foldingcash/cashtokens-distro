# cashtokens-distro

1. Query the distro, releasing month June, June 1 - July 1, amount is arbitrary
1. Take the end date and find the last BCH block found before the file date
    a. https://blockchair.com/bitcoin-cash/blocks for easy UI viewing
    a. https://gz.blockchair.com/bitcoin-cash/blocks/ for block searching especially several days in the past, download release date of blocks to search
    a. Using the time field from the block
1. run the release smart contract
    a. use the block number identified previously
1. run the distro scripts, use the distro dates described previously

# node

v21.6.0 - current
v22.17.0 - error on run