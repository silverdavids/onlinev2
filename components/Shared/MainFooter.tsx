"use client";
import React from 'react';
import Link from "next/link";
import Image from 'next/image';
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { IconArrowBadgeRight, IconBrandTelegram, IconBrandGithubFilled, IconBrandBehance, IconBrandFacebookFilled, IconBrandDiscordFilled, IconCurrencyBitcoin, IconBrandInstagram } from "@tabler/icons-react";

export default function MainFooter() {
    return (
        <footer className="footer_section pt-10 pt-md-15 pt-lg-20 p2-bg pb-12 pb-md-0">
            <div className="container-fluid">
                <div className="row mb-10 mb-md-15 mb-lg-20">
                    <div className="col-12">
                        <div className="footer_section__main">
                            <div className="row gy-8">
                                <div className="col-sm-6 col-md-4 col-lg-4 col-xl-2 col-xxl-2">
                                    <div className="footer_section__sports">
                                        <h4 className="mb-5 mb-md-6">Sport Betting</h4>
                                        <ul className="d-flex flex-column gap-5">
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="/deposit-guide">Deposits &amp; Withdrawals</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="/floorball">Today Offer PDF</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">Full Offer PDF</Link>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-4 col-xl-2 col-xxl-2">
                                    <div className="footer_section__promotions">
                                        <h4 className="mb-5 mb-md-6">Live Betting</h4>
                                        <ul className="d-flex flex-column gap-5">
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="/promotions">In Play</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">Schedule</Link>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-4 col-xl-3 col-xxl-2">
                                    <div className="footer_section__help">
                                        <h4 className="mb-5 mb-md-6">Top Bets</h4>
                                        <ul className="d-flex flex-column gap-5">
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">European Cups (3x)</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">Elite European Leagues (5x)</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">South America (6x)</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-itemscenter">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">Champions League</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">England Premier League</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">Italy Serie A</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">Spanish La Liga</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">England FA Cup</Link>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-6 col-xl-4 col-xxl-3">
                                    <div className="footer_section__security">
                                        <h4 className="mb-5 mb-md-6">Company</h4>
                                        <ul className="d-flex flex-column gap-5">
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="/contact">About Us</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="/contact">Contact us</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="/contact">Cooperation</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="/terms-and-conditions">Terms &amp; Conditions</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="#">Register</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="/contact">Help</Link>
                                            </li>
                                            <li className="iconstyle d-flex align-items-center">
                                                <IconArrowBadgeRight className="fs-five rtawin" />
                                                <Link className="fs-ten n4-color" href="/privacy-policy">Privacy Policy</Link>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="col-sm-8 col-md-5 col-lg-6 col-xxl-3">
                                    <div className="footer_section__community">
                                        <h4 className="mb-5 mb-md-6">Join our Community</h4>
                                        <ul className="d-flex align-items-center flex-wrap gap-5">
                                            <li>
                                                <Link className="footer_section__community-sitem n4-coloLink"
                                                    href="#">
                                                    <IconBrandTelegram className="fs-three footericon" />
                                                </Link>
                                            </li>
                                            <li>
                                                <Link className="footer_section__community-sitem n4-coloLink"
                                                    href="#">
                                                    <IconBrandGithubFilled className="fs-three footericon" />
                                                </Link>
                                            </li>
                                            <li>
                                                <Link className="footer_section__community-sitem n4-coloLink"
                                                    href="#">
                                                    <IconBrandBehance className="fs-three footericon" />
                                                </Link>
                                            </li>
                                            <li>
                                                <Link className="footer_section__community-sitem n4-coloLink"
                                                    href="#">
                                                    <IconBrandFacebookFilled className="fs-three footericon" />
                                                </Link>
                                            </li>
                                            <li>
                                                <Link className="footer_section__community-sitem n4-coloLink"
                                                    href="#">
                                                    <IconBrandInstagram className="fs-three footericon" />
                                                </Link>
                                            </li>
                                        </ul><br/>
                                        Betting is addictive and can be psychologically harmful.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-12 px-0 mx-0">
                        <div className="brand-slider n6-bg pt-7 pb-7">
                            <div className="footer_section__slider swiper-wrapper d-flex align-items-center">
                                <Swiper
                                    className="slider_hero"
                                    loop
                                    speed={2000}
                                    autoplay={{
                                        delay: 0,
                                    }}
                                    slidesPerView="auto"
                                    modules={[Autoplay]}
                                    breakpoints={{
                                        0: {
                                            slidesPerView: 3,
                                            spaceBetween: 5,
                                        },
                                        480: {
                                            slidesPerView: 4,
                                            spaceBetween: 10,
                                        },
                                        575: {
                                            slidesPerView: 5,
                                            spaceBetween: 20,
                                        },
                                        768: {
                                            slidesPerView: 7,
                                            spaceBetween: 20,
                                        },
                                        991: {
                                            slidesPerView: 8,
                                            spaceBetween: 20,
                                        },
                                        1199: {
                                            slidesPerView: 10,
                                            spaceBetween: 20,
                                        },
                                        1499: {
                                            slidesPerView: 13,
                                            spaceBetween: 24,
                                        },
                                        1799: {
                                            slidesPerView: 15,
                                            spaceBetween: 24,
                                        },
                                    }}>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image width={104} height={30} src="/images/nba.jpg" alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image width={120} height={30} src="/images/premierleague.png" alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image width={39} height={30} src="/images/laliga.jpg" alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image width={82} height={29} src="/images/Italian-Serie-A-Logo.png" alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image width={50} height={30} src="/images/champions.webp" alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/Bundesliga-Logo-2002.png" width={117} height={30} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/neteller.webp" width={178} height={30} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/debit.png" width={66} height={30} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/pragmathic-play.png" width={97} height={32} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/play-go.png" width={84} height={32} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/gamomat.png" width={100} height={32} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/paysafecard.png" width={180} height={30} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image width={120} height={30} src="/images/icon/netent.png" alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image width={39} height={30} src="/images/icon/mastercard.png" alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image width={82} height={29} src="/images/icon/skrill.png" alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image width={50} height={30} src="/images/icon/maestro.png" alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/webmoney.png" width={117} height={30} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/neteller.png" width={178} height={30} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/debit.png" width={66} height={30} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/pragmathic-play.png" width={97} height={32} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/play-go.png" width={84} height={32} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                    <SwiperSlide>
                                        <div className="footer_section__slider-brand swiper-slide px-4">
                                            <Image src="/images/icon/gamomat.png" width={100} height={32} alt="Brand" />
                                        </div>
                                    </SwiperSlide>
                                </Swiper>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer >
    )
}
