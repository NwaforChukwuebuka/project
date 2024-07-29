// XXX even though ethers is not used in the code below, it's very likely
// it will be used by any DApp, so we are already including it here
const { ethers } = require("ethers");

// Auxiliary functions 
function hex2str(hex){
  return ethers.toUtf8String(hex);
}
function str2hex(payload){
  return ethers.hexlify(ethers.toUtf8Bytes(payload));
}
function isNummeric (num) {
  return isNaN(num);
}


const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

let users = {};
let totalTxns = 0;

// Handle advance request e.g notice, report and voucher
async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));
  let metadata = data['metadata'];
  let sender = metadata['msg_sender'];
  let payload = data['payload'];

  let strPayload = hex2str(payload);

  if(isNummeric(strPayload)){
    // send or post error report

    const report_req = await fetch(rollup_server + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({payload: str2hex("Message is not on hex format")}),
    });

    return "reject";
  }

  users.push(sender);
  totalTxns += 1;

  uppercaseStrPayload = strPayload.toUpperCase();

  const notice_req = await fetch(rollup_server + "/notice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: str2hex(uppercaseStrPayload) }),
  }); 

  return "accept";
}

// Handle inspect request i.e report only 
async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));
  let payload = data["payload"];

  // Configure users and totalTxns route
  let responseObj;
  if (responseObj == 'users'){
    responseObj = JSON.stringify({users});
  }else if (responseObj == "transactions"){
    responseObj = JSON.stringify({totalTxns});

  }else {
    responseObj = "Route is not implemented";
  }
  const report_req = await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: str2hex(responseObj) }),
  });

  return "accept";
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();
