# What it do
Hopefully lightweight file server with basic authentication from multiple devices and SSL secure file transfer.

# How to setup the server
Setup a certificate with OpenSSL and note the filepaths into config.json; placeholders are provided. Specify storage paths; the server will fill them in order (make sure to note the local directory if storing into it is wanted, although I do not recommend it). A user file will be created in the working directory; it contains user data (nicks, pass hashes and directories). Modify other configurations to taste.

Run with ```node main.js```.