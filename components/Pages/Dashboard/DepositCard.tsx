import React, { useState } from 'react'
import { imagesData } from '@/public/data/dashBoard';
import Image from 'next/image';


export default function DepositCard() {
    const [activeItem, setActiveItem] = useState(imagesData[0]);

    const handleClick = (itemName: any) => {
        setActiveItem(itemName);
    };
    const getItemStyle = (itemName: any) => {
        return {
            border: `1px solid ${activeItem === itemName ? 'var(--accent)' : 'var(--border)'}`,
        };
    };
    return (
        <>
            {imagesData.map((imagesData) => (
                    <button key={imagesData.id} type="button" onClick={() => handleClick(imagesData)}
                        aria-pressed={activeItem.id === imagesData.id}
                        style={getItemStyle(imagesData)} className="smartbet-dashboard__method pay_method__paymethod-item pay-methods">
                        <Image src={imagesData.src} height={70} width={172} alt={imagesData.alt} />
                        <span>{imagesData.alt}</span>
                    </button>
            ))}
        </>
    )
}
