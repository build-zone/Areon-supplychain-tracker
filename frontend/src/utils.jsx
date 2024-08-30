import { ContractAddress, ContractName, InitName } from "@concordium/web-sdk";

export async function initContract(rpc, index) {
  console.debug(`Refreshing info for contract ${index.toString()}`);
  const info = await rpc?.getInstanceInfo(ContractAddress.create(index, 0));
  console.log("Contract fecthed");
  if (!info) {
    throw new Error(`contract ${index} not found`);
  }

  const { version, name, owner, amount, methods, sourceModule } = info;
  const prefix = "init_";
  if (!InitName.toString(name).startsWith(prefix)) {
    throw new Error(`name "${name}" doesn't start with "init_"`);
  }
  return {
    version,
    index,
    name: ContractName.fromInitName(name),
    amount,
    owner,
    methods,
    sourceModule,
  };
}

/**
 * Fetch a challenge from the backend
 */
export async function getChallenge(verifier, accountAddress) {
  const response = await fetch(
    `${verifier}/challenge?address=${accountAddress}`,
    { method: "get" }
  );
  const body = await response.json();
  return body.challenge;
}

/**
 *  Authorize with the backend, and get a auth token.
 */
export async function authorize(verifier, challenge, proof, statement) {
  const response = await fetch(`${verifier}/prove`, {
    method: "post",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify({ challenge, proof, statement }),
  });
  if (!response.ok) {
    throw new Error("Unable to authorize");
  }
  const body = await response.json();
  if (body) {
    return body;
  }
  throw new Error("Unable to authorize");
}
