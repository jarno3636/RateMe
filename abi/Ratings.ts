// Minimal Ratings ABI covering what's used by the app:
// - getAverage(address)
// - getStats(address)
// - getRating(address,address)
// - hasRated(address,address)
// - fee()
// - feeCollector()
// - rate(address,uint8,string)
// - updateRating(address,uint8,string)

const RatingsAbi = [
  {
    "inputs": [{"internalType":"address","name":"ratee","type":"address"}],
    "name":"getAverage",
    "outputs":[{"internalType":"uint256","name":"avgTimes100","type":"uint256"}],
    "stateMutability":"view","type":"function"
  },
  {
    "inputs":[{"internalType":"address","name":"ratee","type":"address"}],
    "name":"getStats",
    "outputs":[
      {"internalType":"uint64","name":"count","type":"uint64"},
      {"internalType":"uint64","name":"totalScore","type":"uint64"}
    ],
    "stateMutability":"view","type":"function"
  },
  {
    "inputs":[
      {"internalType":"address","name":"rater","type":"address"},
      {"internalType":"address","name":"ratee","type":"address"}
    ],
    "name":"getRating",
    "outputs":[
      {"internalType":"uint8","name":"score","type":"uint8"},
      {"internalType":"uint48","name":"createdAt","type":"uint48"},
      {"internalType":"uint48","name":"updatedAt","type":"uint48"},
      {"internalType":"string","name":"comment","type":"string"}
    ],
    "stateMutability":"view","type":"function"
  },
  {
    "inputs":[
      {"internalType":"address","name":"rater","type":"address"},
      {"internalType":"address","name":"ratee","type":"address"}
    ],
    "name":"hasRated",
    "outputs":[{"internalType":"bool","name":"","type":"bool"}],
    "stateMutability":"view","type":"function"
  },
  {
    "inputs":[],
    "name":"fee",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view","type":"function"
  },
  {
    "inputs":[],
    "name":"feeCollector",
    "outputs":[{"internalType":"address","name":"","type":"address"}],
    "stateMutability":"view","type":"function"
  },
  {
    "inputs":[
      {"internalType":"address","name":"ratee","type":"address"},
      {"internalType":"uint8","name":"score","type":"uint8"},
      {"internalType":"string","name":"comment","type":"string"}
    ],
    "name":"rate",
    "outputs":[],
    "stateMutability":"nonpayable","type":"function"
  },
  {
    "inputs":[
      {"internalType":"address","name":"ratee","type":"address"},
      {"internalType":"uint8","name":"newScore","type":"uint8"},
      {"internalType":"string","name":"newComment","type":"string"}
    ],
    "name":"updateRating",
    "outputs":[],
    "stateMutability":"nonpayable","type":"function"
  }
] as const;

export default RatingsAbi;
