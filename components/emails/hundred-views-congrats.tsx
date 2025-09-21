import {
  Body,
  Head,
  Html,
  Link,
  Tailwind,
  Text,
} from "@react-email/components";

interface HundredViewsCongratsEmailProps {
  name: string | null | undefined;
}

const HundredViewsCongratsEmail = ({
  name,
}: HundredViewsCongratsEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="font-sans text-sm">
          <Text>Hi{name && ` ${name}`},</Text>
          <Text>
            I&apos;m Max, founder of Paperky. Congrats on 100 views on your
            documents.
          </Text>
          <Text>Would you help others discover us too?</Text>
          <Text>
            <Link
              href="https://www.g2.com/products/paperky/reviews"
              target="_blank"
              className="text-blue-500 underline"
            >
              Leave a review on G2 →
            </Link>
          </Text>
          <Text>Small gift from us inside.</Text>
          <Text>
            Thanks so much,
            <br />
            Max
          </Text>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default HundredViewsCongratsEmail;
