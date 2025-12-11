import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import "./Carousel.css";
import Loader from "../Loader/Loader";

function Carousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    const fetchBanners = async () => {
      const querySnapshot = await getDocs(collection(db, "banners"));
      const bannerData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const sortedBanners = bannerData.sort((a, b) => a.order - b.order);
      setSlides(sortedBanners);
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (slides.length === 0) {
    return <div className="carousel"><Loader /></div>;
  }

  return (
    <div className="carousel">
      <div
        className="carousel-slide"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="slide">
            <img src={slide.image} alt="Banner" />
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button className="carousel-button prev" onClick={prevSlide}>
            &#8249;
          </button>
          <button className="carousel-button next" onClick={nextSlide}>
            &#8250;
          </button>

          <div className="carousel-indicators">
            {slides.map((_, index) => (
              <span
                key={index}
                className={`indicator ${index === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(index)}
              ></span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Carousel;
