import LegacyInfoPage from "@/components/Pages/Legacy/LegacyInfoPage";

export default function DepositGuidePage() {
  return (
    <LegacyInfoPage
      title="Deposit Guide"
      eyebrow="Help"
      description="Deposit and withdraw methods from the existing online app."
      actions={[
        { href: "/deposit?method=shop", label: "Redeem Shop Deposit" },
        { href: "/dashboard", label: "My Account", variant: "secondary" },
      ]}
    >
      <div className="p2-bg rounded-8 p-5 p-lg-8 text-white-50 static-content">
        <p>
          <strong>
            <u>Deposit Methods</u>
          </strong>
        </p>
        <p>
          <strong>1 Counter deposit -</strong>
        </p>
        <p>Go to any of our branches and purchase a deposit voucher</p>
        <ul>
          <li> - My Account -&gt;&gt; Deposit -&gt;&gt; Enter Code</li>
          <li> - Click on Deposit to complete transaction</li>
        </ul>
        <p>
          2:<strong>Mobile Money</strong>: Coming soon
        </p>

        <p>
          <strong>
            <u>Withdraw Methods</u>
          </strong>
        </p>
        <p>
          1 <strong>Counter withdraw</strong>
        </p>
        <ul>
          <li> - My Account -&gt;&gt; Withdraw -&gt;&gt; Enter Amount and Password</li>
          <li> - Click on Withdraw to initiate withdraw</li>
          <li>
            - Copy the Withdraw Code, go to any of our branches with the code
            and your account ID to be collect your funds
          </li>
          <li> Min: - Timescale: Immediate</li>
          <li>
            Above one million (1,000,000) wait for approval from the finance
            department
          </li>
          <li>
            Request should be made at least one hour before time of collection
            to avoid inconveniencies
          </li>
        </ul>
        <p>
          2 <strong>Mobile Money </strong>: Coming Soon
        </p>
      </div>
    </LegacyInfoPage>
  );
}
