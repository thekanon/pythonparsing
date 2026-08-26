const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "bbcnews-ee071.firebaseapp.com",
  projectId: "bbcnews-ee071",
  storageBucket: "bbcnews-ee071.appspot.com",
  messagingSenderId: "126738818857",
  appId: "1:126738818857:web:4a27810eeb352f332b7938",
  measurementId: "G-69KVWFWSP4"
};

export function getFirebaseConfig() {
  if (!config || !config.apiKey) {
    throw new Error(
      "No Firebase configuration object provided.\n" +
        "Set REACT_APP_FIREBASE_API_KEY in the runtime environment."
    );
  }

  return config;
}
