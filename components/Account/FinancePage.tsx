import Link from "next/link";
import { IconBuildingBank, IconDeviceMobile, IconHistory, IconWallet } from "@tabler/icons-react";

export default function FinancePage({ withdrawalsOnly = false }: { withdrawalsOnly?: boolean }) {
  const options = [
    ...(!withdrawalsOnly ? [{ title: "Deposit at a branch", description: "Redeem a deposit code issued at a SmartBet branch.", href: "/deposit?method=shop", icon: IconBuildingBank }] : []),
    ...(!withdrawalsOnly ? [{ title: "Deposit with mobile money", description: "Top up using MTN Mobile Money or Airtel Money.", href: "/deposit/mobile-money", icon: IconDeviceMobile }] : []),
    { title: "Withdraw at a branch", description: "Create a withdrawal code and collect your funds at a branch.", href: "/withdraw/branch", icon: IconBuildingBank },
    { title: "MTN Mobile Money", description: "Request a withdrawal to your mobile money account.", href: "/withdraw/mobile-money?method=mtn", icon: IconDeviceMobile },
    { title: "Airtel Money", description: "Request a withdrawal to your Airtel Money account.", href: "/withdraw/mobile-money?method=airtel", icon: IconWallet },
    { title: "Account statement", description: "Review deposits, withdrawals, and account activity.", href: "/transactions", icon: IconHistory },
  ];
  return <div className="smartbet-card-grid">{options.map(({ title, description, href, icon: Icon }) => <Link href={href} className="smartbet-panel smartbet-destination" key={href}><Icon size={28} aria-hidden="true" /><h2>{title}</h2><p>{description}</p><span>Continue &rarr;</span></Link>)}</div>;
}
