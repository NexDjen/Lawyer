#!/usr/bin/env python3
import cv2
import numpy as np
import argparse

def suppress_glare(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    # 1) Яркие блики по V
    bright = cv2.threshold(v, 230, 255, cv2.THRESH_BINARY)[1]
    # 2) Радужные голограммы: высокое S и высокое V
    holo = cv2.inRange(hsv, (0, 80, 140), (180, 255, 255))
    # 3) Объединяем и расширяем
    mask = cv2.bitwise_or(bright, holo)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5,5))
    mask = cv2.dilate(mask, kernel, iterations=2)
    # Inpaint по маске
    inpainted = cv2.inpaint(img, mask, 3, cv2.INPAINT_TELEA)
    return inpainted

def normalize_illumination(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Морфологический top-hat для выравнивания фона
    se = cv2.getStructuringElement(cv2.MORPH_RECT, (25,25))
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, se)
    # CLAHE для контраста
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    enhanced = clahe.apply(tophat)
    return enhanced

def denoise_and_binarize(gray):
    # Bilateral фильтр сохраняет края
    den = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    # Лёгкая гамма-коррекция перед бинаризацией
    den = np.clip(((den/255.0) ** (0.9)) * 255.0, 0, 255).astype(np.uint8)
    # Адаптивная бинаризация (усиленная)
    bin_img = cv2.adaptiveThreshold(den, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                    cv2.THRESH_BINARY, 31, 12)
    # Уберём мелкий мусор
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
    bin_img = cv2.morphologyEx(bin_img, cv2.MORPH_OPEN, kernel, iterations=1)
    return bin_img

def auto_rotate(img):
    # Попытка выправить небольшой наклон через HoughLines
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLines(edges, 1, np.pi/180, 200)
    angle = 0.0
    if lines is not None:
        angles = []
        for rho, theta in lines[:,0]:
            a = (theta*180/np.pi) % 180
            if a > 90: a -= 180
            if -45 < a < 45:
                angles.append(a)
        if len(angles) > 0:
            angle = np.median(angles)
    if abs(angle) > 0.5 and abs(angle) < 15:
        (h, w) = img.shape[:2]
        M = cv2.getRotationMatrix2D((w//2, h//2), angle, 1.0)
        img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return img

def gray_world(img):
    # Баланс белого по серому миру
    result = img.copy().astype(np.float32)
    for c in range(3):
        mean = result[:,:,c].mean()
        if mean > 0:
            result[:,:,c] *= (128.0 / mean)
    result = np.clip(result, 0, 255).astype(np.uint8)
    return result

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True)
    ap.add_argument('--output', required=True)
    args = ap.parse_args()

    img = cv2.imread(args.input)
    if img is None:
        raise SystemExit('cannot read input image')

    img = auto_rotate(img)
    img = gray_world(img)
    img = suppress_glare(img)
    gray = normalize_illumination(img)
    bin_img = denoise_and_binarize(gray)

    # Небольшое усиление чёткости
    kernel = np.array([[0, -1, 0], [-1, 5,-1], [0, -1, 0]])
    sharp = cv2.filter2D(bin_img, -1, kernel)

    cv2.imwrite(args.output, sharp)

if __name__ == '__main__':
    main()

