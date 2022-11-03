import abi from '../utils/BuyMeACoffee.json';
import { ethers } from "ethers";
import Head from 'next/head'
import Image from 'next/image'
import React, { useEffect, useState } from "react";
import styles from '../styles/Home.module.css';
import { BiCoffee } from 'react-icons/bi';
import { FiCoffee } from 'react-icons/fi';

export default function Home() {
  // Contract Address & ABI
  const contractAddress = "0xa15b4D982766D62291f850a22194349bfe2BF941";
  const contractABI = abi.abi;

  // Block explorer
  const blockExplorerURL = "https://goerli.etherscan.io/tx/";

  // Component state
  const [currentAccount, setCurrentAccount] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [memos, setMemos] = useState([]);
  const [mining, setMining] = useState(null);

  const onNameChange = (event) => {
    setName(event.target.value);
  }

  const onMessageChange = (event) => {
    setMessage(event.target.value);
  }

  // Wallet connection logic
  const isWalletConnected = async () => {
    try {
      const { ethereum } = window;

      const accounts = await ethereum.request({ method: 'eth_accounts' })
      console.log("accounts: ", accounts);

      if (accounts.length > 0) {
        const account = accounts[0];
        console.log("wallet is connected! " + account);
      } else {
        console.log("make sure MetaMask is connected");
      }
    } catch (error) {
      console.log("error: ", error);
    }
  }

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        console.log("please install MetaMask");
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  }

  const buyCoffee = async (tip) => {
    tip = "0.000000001";
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum, "any");
        const signer = provider.getSigner();
        const buyMeACoffee = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        console.log("buying coffee..", signer.getAddress(), tip)

        const coffeeTxn = buyMeACoffee.buyCoffee(
          name ? name : signer.getAddress(),
          message ? message : "Enjoy your coffee!",
          { value: ethers.utils.parseEther(tip) }
        ).then((transaction) => {

          setMining(transaction.hash)

          transaction.wait()
            .then((receipt) => {
              console.log("the transaction was succesful: ", receipt)

              setMining(null)
              // Only if succeded:
              setName("");
              setMessage("");
            })
            .catch((error) => {
              // handle errors here
              console.log("TX Error: ", error)
            })
        }).catch((error) => {
          switch (error.code) {
            case 4001:
            default:
              console.log("TX Error: ", error);
              setMining(null);
              // Clear the form fields.
              setName("");
              setMessage("");
          }
        })
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Function to fetch all memos stored on-chain.
  const getMemos = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const buyMeACoffee = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        console.log("fetching memos from the blockchain..");
        const memos = await buyMeACoffee.getMemos();
        console.log("fetched!");
        setMemos(memos);
      } else {
        console.log("Metamask is not connected");
      }

    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    let buyMeACoffee;
    isWalletConnected();
    getMemos();

    // Create an event handler function for when someone sends
    // us a new memo.
    const onNewMemo = (from, timestamp, name, message) => {
      console.log("Memo received: ", from, timestamp, name, message);

      // Since React may batch multiple setState() calls into a single update for performance,
      // use this pattern of state update, guaranteeing that the new memo gets added to the latest version of memos[]
      setMemos((prevState) => [...prevState, { address: from, timestamp: new Date(timestamp * 1000), message, name }]);
    };

    const { ethereum } = window;

    // Listen for new memo events.
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum, "any");
      const signer = provider.getSigner();
      buyMeACoffee = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      buyMeACoffee.on("NewMemo", onNewMemo);
    }

    return () => {
      if (buyMeACoffee) {
        buyMeACoffee.off("NewMemo", onNewMemo);
      }
    }
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Buy Walter a Coffee!</title>
        <meta name="description" content="Tipping site" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        {
          currentAccount &&
          <div>
            <h1 className={styles.title}>
              Buy Walter a Coffee!
            </h1>
          </div>
        }
        {
          currentAccount
            ? (
              !mining ?
                (
                  <div>
                    <form className={styles.form}>
                      <div>
                        <label>
                          Name
                </label>
                        <br />

                        <input
                          id="name"
                          type="text"
                          placeholder="address will be used if left empty"
                          onChange={onNameChange}
                        />
                      </div>
                      <br />
                      <div>
                        <label>
                          Send Walter a message
                </label>
                        <br />

                        <textarea
                          rows={3}
                          placeholder="Enjoy your coffee!"
                          id="message"
                          onChange={onMessageChange}
                          required
                        >
                        </textarea>
                      </div>
                      <div className={styles.formButtonFooter}>
                        <button
                          className={styles.buttonForm}
                          type="button"
                          onClick={() => buyCoffee("0.000000001")}
                        >
                          <BiCoffee /> Send 1 Coffee
                        </button>
                        <button
                          className={styles.buttonForm}
                          type="button"
                          onClick={() => buyCoffee("0.000000003")}
                        >
                          <FiCoffee /> Send LARGE! Coffee
                        </button>
                      </div>
                    </form>
                  </div>
                )
                : <div>
                  <span className={styles.miningProgress}>Transaction {mining.substring(0, 8) + '...'} is being mined...</span>
                  <a
                    href={blockExplorerURL + mining}
                    target="_blank"
                    rel="noopener noreferrer"
                  >See block explorer
                </a>
                </div>

            )
            : <button onClick={connectWallet}> Connect your wallet to start. </button>
        }
      </main>

      {currentAccount && (<h1 className={styles.memoTitle}>Messages received so far</h1>)}

      {currentAccount && ([].concat(memos).sort((a, b) => a.timestamp < b.timestamp ? 1 : -1).map((memo, idx) => {
        return (
          <div key={idx} className={styles.memo}>
            <p style={{ "fontWeight": "bold" }}>"{memo.message}"</p>
            <p>From: {memo.name}</p>
            <p>At:   {new Date(memo.timestamp * 1000).toString()}</p>
          </div>
        )
      }))}

      <footer className={styles.footer}>
        <a
          href="https://github.com/walterz-eth/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Created by walterz.eth
        </a>
      </footer>
    </div>
  )
}
