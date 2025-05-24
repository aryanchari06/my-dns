# Custom DNS Resolver in Node.js

A custom recursive DNS resolver built from scratch using Node.js, leveraging the `dgram` and `dns-packet` modules. This DNS server handles recursive queries by querying root and authoritative DNS servers step-by-step, supports caching for faster responses, and properly parses DNS authority and additional sections.

---

## Features

- **Recursive DNS resolution:**  
  Handles DNS queries by recursively querying root servers and authoritative name servers until it obtains an answer.

- **Caching:** 
  Implements in-memory caching of DNS responses with TTL management to reduce latency and decrease upstream server load.

- **UDP-based server:**  
  Listens for DNS queries over UDP on port 53 using the native Node.js `dgram` module.

- **DNS packet encoding/decoding:**  
  Uses the `dns-packet` library to parse and construct DNS packets efficiently.

- **Authority and Additional section parsing:**  
  Extracts name server and IP address information from DNS responses to guide recursive lookups.

- **Pending query management:**  
  Tracks outstanding recursive queries to correctly route responses back to the original clients.

---

## How It Works

1. Receives DNS queries from clients via UDP.
2. Checks cache for a valid answer:
   - If found, responds immediately.
   - Otherwise, starts recursive resolution.
3. Recursive resolution:
   - Queries root DNS servers.
   - Parses referrals in authority and additional sections.
   - Continues querying authoritative servers until an answer is found.
4. Caches the response along with TTL information.
5. Sends the answer back to the client.

---

## Installation

```bash
git clone https://github.com/aryanchari06/custom-dns-resolver.git
cd custom-dns-resolver
npm install
```

## Usage

### Running the DNS Server

To start the DNS server locally, run:

```bash
sudo node index.js
```
Note: Listening on port 53 requires elevated privileges, so you may need to use sudo.

Testing DNS Queries
You can test your DNS server using tools like dig or nslookup by specifying your local server as the DNS resolver.

Example using dig:

```bash
dig @localhost example.com A
```
Example using nslookup:
```bash
nslookup example.com 127.0.0.1
```
You should see your server respond with the resolved IP address.

Configure Your System to Use the DNS Server
You can temporarily set your system’s DNS server to 127.0.0.1 (localhost) to route DNS queries to your custom DNS server for testing purposes.

# Dependencies
- Node.js
- dns-packet
- Native Node.js dgram module for UDP sockets
- node-cache for in-memory caching

# Docker 
```docker pull aryanchari/my-dns:latest```
