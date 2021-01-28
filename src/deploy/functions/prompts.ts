import * as clc from "cli-color";

import { CloudFunctionTrigger, getFunctionLabel } from "../../functionsDeployHelper";
import { FirebaseError } from "../../error";
import { promptOnce } from "../../prompt";
import * as utils from "../../utils";

/**
 * Checks if a deployment will create any functions with a failure policy.
 * If there are any, prompts the user to acknowledge the retry behavior.
 * @param options
 * @param functions A list of all functions in the deployment
 */
export async function promptForFailurePolicies(
  options: any,
  functions: CloudFunctionTrigger[]
): Promise<void> {
  // Collect all the functions that have a retry policy
  const failurePolicyFunctions = functions.filter((fn: CloudFunctionTrigger) => {
    return !!fn.failurePolicy;
  });

  if (failurePolicyFunctions.length) {
    const failurePolicyFunctionLabels = failurePolicyFunctions.map((fn: CloudFunctionTrigger) => {
      return getFunctionLabel(_.get(fn, "name"));
    });
    const retryMessage =
      "The following functions will be retried in case of failure: " +
      clc.bold(failurePolicyFunctionLabels.join(", ")) +
      ". " +
      "Retried executions are billed as any other execution, and functions are retried repeatedly until they either successfully execute or the maximum retry period has elapsed, which can be up to 7 days. " +
      "For safety, you might want to ensure that your functions are idempotent; see https://firebase.google.com/docs/functions/retries to learn more.";

    utils.logLabeledWarning("functions", retryMessage);

    if (options.nonInteractive && !options.force) {
      throw new FirebaseError("Pass the --force option to deploy functions with a failure policy", {
        exit: 1,
      });
    } else if (!options.nonInteractive) {
      const proceed = await promptOnce({
        type: "confirm",
        name: "confirm",
        default: false,
        message: "Would you like to proceed with deployment?",
      });
      if (!proceed) {
        throw new FirebaseError("Deployment canceled.", { exit: 1 });
      }
    }
  }
}