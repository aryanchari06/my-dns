const dgram = require("node:dgram");
const dnsPacket = require("dns-packet");
const NodeCache = require("node-cache");

const DEF_PORT = 53;
const ROOT_IP = "198.41.0.4";
const LOCAL_IP = "127.0.0.1";

async function init() {
  const cached = new NodeCache({ stdTTL: 300 });
  const server = dgram.createSocket("udp4");
  let origMsg;
  let origClient;
  const pendingNSLookups = new Map();

  server.on("message", (msg, remoteInfo) => {
    const incomingMsg = dnsPacket.decode(msg);
    if (incomingMsg.questions[0].type === "A")
      if (incomingMsg.type === "query") {
        switch (incomingMsg.questions[0].type) {
          case "PTR": {
            const responseForPTR = dnsPacket.encode({
              id: incomingMsg.id,
              type: "response",
              flags: dnsPacket.AUTHORITATIVE_ANSWER,
              questions: incomingMsg.questions,
              answers: [
                {
                  name: incomingMsg.questions[0].name,
                  type: "PTR",
                  class: "IN",
                  ttl: 3600,
                  data: "localhost",
                },
              ],
            });
            server.send(responseForPTR, remoteInfo.port, remoteInfo.address);
            break;
          }
          case "A": {
            if (
              !(
                incomingMsg.answers.length ||
                incomingMsg.additionals.length ||
                incomingMsg.authorities.length
              ) &&
              incomingMsg.type === "query"
            ) {
              origClient = remoteInfo;
              origMsg = incomingMsg;

              const cachedData = cached.get(incomingMsg.questions[0].name);

              if (cachedData) {
                // console.log("From cache: ", cachedData);
                const cachedResponse = dnsPacket.encode({
                  id: incomingMsg.id,
                  type: "response",
                  flags: dnsPacket.AUTHORITATIVE_ANSWER,
                  questions: incomingMsg.questions,
                  answers: cachedData,
                });

                server.send(
                  cachedResponse,
                  remoteInfo.port,
                  remoteInfo.address
                );
                // console.log("sent from cache");
                return;
              } else {
                const queryToRootServer = dnsPacket.encode({
                  id: incomingMsg.id,
                  type: "query",
                  flags: dnsPacket.RECURSION_DESIRED,
                  questions: incomingMsg.questions,
                });

                server.send(queryToRootServer, DEF_PORT, ROOT_IP);
              }
            }
          }
        }
      } else if (incomingMsg.type === "response") {
        if (
          incomingMsg.authorities.length > 0 &&
          incomingMsg.answers.length === 0
        ) {
          const authName = incomingMsg.authorities[0].data;
          const authIP = incomingMsg.additionals.find((auth) => {
            if (auth.name === authName && auth.type === "A") return auth.data;
          });

          if (!authIP) {
            const queryForAuthName = dnsPacket.encode({
              id: incomingMsg.id,
              type: "query",
              flags: dnsPacket.RECURSION_DESIRED,
              questions: [
                {
                  name: authName,
                  type: "A",
                  class: "IN",
                },
              ],
            });

            server.send(queryForAuthName, DEF_PORT, ROOT_IP);
            pendingNSLookups.set(authName, { incomingMsg, remoteInfo });
            return;
          }

          const forwardToAuthIP = dnsPacket.encode({
            id: incomingMsg.id,
            type: "query",
            flags: dnsPacket.RECURSION_DESIRED,
            questions: incomingMsg.questions,
          });

          server.send(forwardToAuthIP, DEF_PORT, authIP.data);
        } else if (incomingMsg.answers.length > 0) {
          const qName = incomingMsg.questions[0].name;
          const pending = pendingNSLookups.get(qName);
          if (pending) {
            const forwardQuery = dnsPacket.encode({
              id: incomingMsg.id,
              type: "query",
              flags: dnsPacket.RECURSION_DESIRED,
              questions: pending.incomingMsg.questions,
            });
            server.send(forwardQuery, DEF_PORT, incomingMsg.answers[0].data);
            pendingNSLookups.delete(qName);
          } else {
            const finalResponse = dnsPacket.encode({
              id: incomingMsg.id,
              type: "response",
              flags: dnsPacket.AUTHORITATIVE_ANSWER,
              questions: origMsg.questions,
              answers: incomingMsg.answers,
            });

            const isCachedAlready = cached.has(origMsg.questions[0].name);
            // console.log('isCached: ', isCachedAlready)
            if (!isCachedAlready) {
              const domainName = origMsg.questions[0].name;
              const domainData = incomingMsg.answers;
              cached.set(domainName, domainData);
            }

            if (incomingMsg.answers[0].type === "A") {
              server.send(finalResponse, origClient.port, origClient.address);
              pendingNSLookups.clear();
            }
          }
        }
      }
  });

  server.bind(DEF_PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${DEF_PORT}`);
  });
}

init();
