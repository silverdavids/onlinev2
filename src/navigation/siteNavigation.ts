export const accountLinks = [
  { label: "Overview", href: "/dashboard" },
  { label: "Deposit", href: "/deposit" },
  { label: "Withdraw", href: "/withdraw" },
  { label: "My bets", href: "/tickets" },
  { label: "Statements", href: "/transactions" },
  { label: "My bonuses", href: "/bonuses" },
  { label: "Profile", href: "/profile" },
  { label: "Notifications", href: "/notifications" },
];

export const menuGroups = [
  { title: "Betting", links: [
    { label: "Sports", href: "/soccer" },
    { label: "Live betting", href: "/live-betting" },
    { label: "Bet slip", href: "/betslip" },
    { label: "Load booking code", href: "/booking-code" },
    { label: "Search", href: "/search" },
  ] },
  { title: "My account", links: [
    ...accountLinks,
    { label: "Deposits & withdrawals", href: "/finance" },
    { label: "Change password", href: "/change-password" },
  ] },
  { title: "Help & information", links: [
    { label: "Deposit guide", href: "/deposit-guide" },
    { label: "Responsible gaming", href: "/responsible-gaming" },
    { label: "Gaming rules", href: "/gaming-rules" },
    { label: "Terms & conditions", href: "/terms" },
    { label: "Privacy policy", href: "/privacy-policy" },
    { label: "Contact", href: "/contact" },
  ] },
];
