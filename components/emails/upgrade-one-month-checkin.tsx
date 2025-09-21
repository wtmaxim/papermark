import React from "react";

import {
  Body,
  Head,
  Html,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";

interface UpgradeCheckinEmailProps {
  name: string | null | undefined;
}

const UpgradeCheckinEmail = ({ name }: UpgradeCheckinEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Check-in from Max</Preview>
      <Tailwind>
        <Body className="font-sans text-sm">
          <Text>Hi{name && ` ${name}`},</Text>
          <Text>
            It is Max here. How has your experience been so far? Are you
            getting the value you expected from the advanced features?
          </Text>

          <Text>
            Any feedback - what&apos;s working well and what could we improve?
          </Text>
          <Text>Max</Text>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default UpgradeCheckinEmail;
