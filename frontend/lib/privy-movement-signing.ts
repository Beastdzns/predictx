// Movement/Aptos signing logic removed.
// This project uses Monad (EVM).

export const privyMovementSigning = {
  signTransaction: async () => {
    throw new Error("Movement signing not supported on Monad EVM.");
  }
};
