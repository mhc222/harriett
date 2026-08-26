import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { executeFacebookDelete, executeFacebookPublish } from "@/lib/facebook-action";

const FacebookActionTaskSchema = z.object({
  actionRequestId: z.string().uuid(),
  action: z.enum(["publish", "delete"]),
});

export const executeFacebookAction = schemaTask({
  id: "execute-facebook-action",
  schema: FacebookActionTaskSchema,
  retry: { maxAttempts: 1 },
  queue: { name: "facebook-page-actions", concurrencyLimit: 1 },
  run: async ({ actionRequestId, action }) => action === "publish"
    ? executeFacebookPublish(actionRequestId)
    : executeFacebookDelete(actionRequestId),
});
