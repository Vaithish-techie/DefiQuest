// Connect to MetaMask and return wallet address
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask is not installed. Please install it to use this app.');
        return null;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        return accounts[0];
    } catch (error) {
        console.error("User rejected the connection request:", error);
        alert('You must connect your wallet to sign in.');
        return null;
    }
}
