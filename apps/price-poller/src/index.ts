import axios from "axios";

interface BinancePrice {
  symbol: string;
  price: string;
}

async function getBinancePrice(symbol: string): Promise<void> {
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
    const response = await axios.get<BinancePrice>(url);
    console.log(`${symbol}: $${response.data.price}`);
  } catch (error) {
    console.error("Error fetching price:", error);
  }
}

// Exam