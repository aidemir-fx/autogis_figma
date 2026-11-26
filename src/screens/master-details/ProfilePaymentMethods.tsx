import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import { PaymentMethod, PaymentMethodLabel, PaymentMethodList } from "./mobileStyles";

const methods = [
    { keys: ["cash"], label: "Наличные", Icon: PaymentsOutlinedIcon },
    { keys: ["card"], label: "Карта", Icon: CreditCardOutlinedIcon },
    { keys: ["sbp", "qr"], label: "СБП", Icon: QrCode2OutlinedIcon },
];

export function ProfilePaymentMethods({ payments }: { payments?: readonly string[] }) {
    const available = methods.filter(({ keys }) => keys.some((key) => payments?.includes(key)));
    if (!available.length) return null;

    return (
        <PaymentMethodList>
            {available.map(({ label, Icon }) => (
                <PaymentMethod key={label}>
                    <Icon aria-hidden="true" />
                    <PaymentMethodLabel>{label}</PaymentMethodLabel>
                </PaymentMethod>
            ))}
        </PaymentMethodList>
    );
}
