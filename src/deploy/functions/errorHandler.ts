import * as clc from "cli-color";

import * as logger from "../../logger";
import { FirebaseError } from "../../error";

type OperationType =
  | "create"
  | "update"
  | "delete"
  | "upsert schedule"
  | "delete schedule"
  | "make public";

type Level = "error" | "warning";

interface ErrorInfo {
  functionName: string;
  operationType: OperationType;
  message: string;
}

export class ErrorHandler {
  errors: ErrorInfo[] = [];
  warnings: ErrorInfo[] = [];

  record(level: Level, functionName: string, operationType: OperationType, message: string): void {
    const info: ErrorInfo = {
      functionName,
      operationType,
      message,
    };
    if (level === "error") {
      this.errors.push(info);
    } else if (level === "warning") {
      this.warnings.push(info);
    }
  }

  printErrors() {
    if (this.errors.length === 0) {
      return;
    }
    logger.info("\n\nFunctions deploy had errors with the following functions:");
    for (const failedDep of this.errors) {
      logger.info(`\t${failedDep.functionName}`);
    }
    logger.info("\n\nTo try redeploying those functions, run:");
    logger.info(
      "    " +
        clc.bold("firebase deploy --only ") +
        clc.bold('"') +
        clc.bold(
          this.errors
            .map((failedDep) => `functions:${failedDep.functionName.replace(/-/g, ".")}`)
            .join(",")
        ) +
        clc.bold('"')
    );
    logger.info("\n\nTo continue deploying other features (such as database), run:");
    logger.info("    " + clc.bold("firebase deploy --except functions"));
    // Print all the original messages at debug level.
    for (const failedDep of this.errors) {
      logger.debug(
        `\tError during ${failedDep.operationType} for ${failedDep.functionName}: ${failedDep.message}`
      );
    }
    throw new FirebaseError("Functions did not deploy properly.");
  }

  printWarnings() {
    if (this.warnings.length === 0) {
      return;
    }
    const failedIamCalls = this.warnings.filter((e) => e.operationType === "make public");
    if (failedIamCalls.length) {
      logger.info("\n\nUnable to set publicly accessible IAM policy on the following functions:");
      for (const failedDep of failedIamCalls) {
        logger.info(`\t${failedDep.functionName}`);
      }
      logger.info("\n\nUnauthorized users will not be able access this function.");
      logger.info(
        "\n\nThis may be caused by an organization policy that restricts Network Access on your project."
      );
    }

    // Print all the original messages at debug level.
    for (const failedDep of this.warnings) {
      logger.debug(
        `\tWarning during${failedDep.operationType} for ${failedDep.functionName}: ${failedDep.message}`
      );
    }
  }
}
