// Movement/Aptos payment logic removed.
// This project uses Monad (EVM).

export const x402MovePayment = {
  sendPayment: async () => {
    throw new Error("Movement payments not supported on Monad EVM.");
  }
};
