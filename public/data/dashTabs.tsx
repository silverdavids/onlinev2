import { IconBellRinging, IconCreditCard, IconCreditCardOff, IconHistory, IconLogout, IconSettings, IconUser, IconWallet } from "@tabler/icons-react";
import React from "react";

export const dashboardTabs = [
  {
    id: 1,
    tabname: "Deposit",
    icon: <IconWallet className="ti ti-wallet fs-five n5-color" />,
  },
  {
    id: 2,
    tabname: "Withdrawal",
    icon: <IconCreditCard className="ti ti-credit-card fs-five n5-color" />,
  },
  {
    id: 4,
    tabname: "Transactions",
    icon: <IconHistory
      className="ti ti-history fs-five n5-color" />,
  },
  {
    id: 5,
    tabname: "Profile",
    icon: <IconUser
      className="ti ti-user fs-five n5-color" />,
  },
];