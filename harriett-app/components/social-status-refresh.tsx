"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HarriettWorkStatus } from "@/components/facebook-draft-form";

const publishSteps = [
  "Saving the exact post approval",
  "Checking the connected Facebook Page",
  "Sending the post securely to Facebook",
  "Waiting for Facebook to return the live post",
  "Saving the Facebook link in Harriett",
];

const deleteSteps = [
  "Saving the deletion approval",
  "Checking the connected Facebook Page",
  "Requesting removal from Facebook",
  "Waiting for Facebook to confirm deletion",
  "Archiving the post in Harriett",
];

export function SocialStatusRefresh({
  active,
  actionStatus,
  operation,
}: {
  active: boolean;
  actionStatus?: string;
  operation: "publishing" | "deleting";
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => router.refresh(), 2_500);
    return () => window.clearInterval(interval);
  }, [active, router]);

  if (!active) return null;
  const activeStep = actionStatus === "running" ? 2 : 1;
  const deleting = operation === "deleting";
  return (
    <HarriettWorkStatus
      title={deleting ? "Harriett is deleting your post" : "Harriett is publishing your post"}
      steps={deleting ? deleteSteps : publishSteps}
      activeStep={activeStep}
    />
  );
}
