import { sendEmail } from "@/lib/resend";
import { CreateUserEmailProps } from "@/lib/types";

import UpgradePlanEmail from "@/components/emails/upgrade-plan";

const PLAN_TYPE_MAP = {
  pro: "Pro",
  business: "Business",
  datarooms: "Data Rooms",
  "datarooms-plus": "Data Rooms Plus",
};

export const sendUpgradePlanEmail = async (
  params: CreateUserEmailProps & { planType: string },
) => {
  const { name, email } = params.user;
  const { planType } = params;
  const emailTemplate = UpgradePlanEmail({ name, planType });

  const planTypeText = PLAN_TYPE_MAP[planType as keyof typeof PLAN_TYPE_MAP];

  try {
    await sendEmail({
      to: email as string,
      subject: `Thank you for upgrading to Paperky ${planTypeText}!`,
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};
