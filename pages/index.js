import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useState, useRef } from "react";
import Web3Modal from "web3modal";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from "../styles/Home.module.css";

const Home = () => {
  const [walletConnected, setWalletConnected] = useState(false);

  const [presaleStarted, setPresaleStarted] = useState(false);

  const [presaleEnded, setPresaleEnded] = useState(false);

  const [loading, setLoading] = useState(false);

  const [isOwner, setIsOwner] = useState(false);

  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");

  const web3ModalRef = useRef();

  const getProviderOrSigner = async (needSigner = false) => {
    //get the current value of the ref and mandate it to connect
    const provider = await web3ModalRef.current.connect();
    //connecting to the real Web3 provider e.g metamask
    const web3Provider = new providers.Web3Provider(provider);

    //if user id not connected to rinkeby network, flag an immediate error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    //if signer is set to true
    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  };

  //let write a function that get the owner of the contract
  const getOwner = async () => {
    try {
      //get the provider to read the blockchain
      const provider = await getProviderOrSigner();
      //create an instance of the contract
      const nftContractInstance = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      //read the owner property of the contract which was inherited from the Ownable.sol contract
      const _owner = await nftContractInstance.owner();
      
      //after getting the owner value from the blockchain, we need to compare
      //it with the current user address to certify the owner
      const signer = await getProviderOrSigner(true);
      //the signer is required to get the address of the currently connected wallet user
      const address = await signer.getAddress();
      // console.log(address.toString())
      //compare
      if (_owner.toString().toLowerCase() === address.toString().toLowerCase()) {
        setIsOwner(true);
      }

      
    } catch (err) {
      console.error(err.message);
    }
  };

  //connect the wallet by calling the getProviderOrSigner function....
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err.message);
    }
  };

  //start presale timer
  const startPresale = async () => {
    try {
      //get a signer since its a write tx
      const signer = await getProviderOrSigner(true);
      //create the contract instance
      const nftContractInstance = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const tx = await nftContractInstance.startPresale();
      setLoading(true);
      await tx.wait();

      setLoading(false);

      await checkIfPresaleStarted();
    } catch (err) {
      console.error(err);
    }
  };

  const checkIfPresaleStarted = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // call the presaleStarted from the contract
      const _presaleStarted = await nftContract.presaleStarted();
      if (!_presaleStarted) {
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err) {
      console.error(err);
    }
  };

  //check if presale has ended
  const checkIfPresaleEnded = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftInstance = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _presaleEnded = await nftInstance.presaleEnd();
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }

      return hasEnded;
    } catch (err) {
      console.error(err);
    }
  };

  const presaleMint = async () => {
    try {
      //need a signer since its a write transaction
      const signer = await getProviderOrSigner(true);
      //get contract instance
      const nftContractInstance = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      //call the presaleMint func on the contract instance
      const tx = await nftContractInstance.presaleMint({
        value: utils.parseEther("0.02"),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);

      window.alert("You have successfully minted a Crypto Dev NFT!!");
    } catch (err) {
      console.error(err);
    }
  };

  const publicMint = async () => {
    try {
      //get the signer since its a write transaction
      const signer = await getProviderOrSigner(true);
      //create an instance of the contract
      const nftContractInstance = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      //mint with public authority
      const tx = await nftContractInstance.mint({
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("You have successfully minted a Crypto Dev NFT!!");
    } catch (err) {
      console.error(err);
    }
  };

  const getTokenIdsMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContractInstance = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      const _tokenIds = await nftContractInstance.tokenIds();
      //need to convert tokenIds to string...since it a BigNumber
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };

  //create the useEffect state management
  useEffect(() => {
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

    const _presaleStarted = checkIfPresaleStarted();
    
    if(_presaleStarted){
      checkIfPresaleEnded()
    }

    getTokenIdsMinted();

    const presaleEndedInterval = setInterval(async() => {
      const _presaleStarted = await checkIfPresaleStarted();
      if(_presaleStarted){
        const _presaleEnded = await checkIfPresaleEnded();
        if(_presaleEnded){
          clearInterval(presaleEndedInterval)
        }
      }
    }, 5 * 1000)

    setInterval(async() => {
      await getTokenIdsMinted();
    }, 5 * 1000)
    }

  }, [walletConnected])

  //create a renderButton component to display various button based on application state...
  console.log(isOwner)
  const renderButton = () => {
    //if walletConnected is false, display the connect wallet button
    if (!walletConnected) {
      return <button onClick={connectWallet} className={styles.button}>Connect your wallet</button>;
    }
    //anytime loading is true
    else if (loading) {
      return <button className={styles.button}>Loading.........</button>;
    }

    //if presale has not started and the getOwner returns true;
    else if (isOwner && !presaleStarted) {
     return <button onClick={startPresale} className={styles.button}>Start Presale!!</button>;
    }

    //if presale hasnt started and the the current user is not the owneer of the contract
    else if (!presaleStarted) {
      return <h2 className={styles.description}>Presale hasnt Started, check later!</h2>;
    }

    else if (presaleStarted && !presaleEnded) {
      return (
        <>
          <div className={styles.description}>
            Presale has Started!!!.. If your wallet address is whitelisted, Mint
            a Crypto Dev NFT
          </div>
          <button onClick={presaleMint} className={styles.button}>Presale Mint</button>
        </>
      );
    }

   else if (presaleStarted && presaleEnded) {
      return <button onClick={publicMint} className={styles.button}>Public Mint</button>;
    }
  };
  
  return (
  <div>
     <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" alt="nft-dev-colection" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>

  </div>
  )
};
export default Home;