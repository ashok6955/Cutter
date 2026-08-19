# Let's verify the text table rounding and total
text_table = {
  "01": 360, "02": 850, "03": 390, "04": 200, "05": 351, "06": 320, "07": 350, "08": 450, "09": 180, "10": 260,
  "11": 140, "12": 355, "13": 700, "14": 571, "15": 610, "16": 340, "17": 80, "18": 405, "19": 385, "20": 740,
  "21": 360, "22": 580, "23": 365, "24": 241, "25": 305, "26": 300, "27": 395, "28": 415, "29": 335, "30": 450,
  "31": 515, "32": 510, "33": 415, "34": 220, "35": 170, "36": 286, "37": 355, "38": 240, "39": 220, "40": 215,
  "41": 541, "42": 456, "43": 265, "44": 660, "45": 275, "46": 235, "47": 400, "48": 430, "49": 120, "50": 561,
  "51": 610, "52": 395, "53": 100, "54": 440, "55": 420, "56": 240, "57": 370, "58": 250, "59": 185, "60": 480,
  "61": 110, "62": 290, "63": 561, "64": 320, "65": 565, "66": 150, "67": 400, "68": 445, "69": 655, "70": 330,
  "71": 285, "72": 355, "73": 355, "74": 445, "75": 235, "76": 325, "77": 180, "78": 116, "79": 460, "80": 520,
  "81": 340, "82": 335, "83": 220, "84": 345, "85": 200, "86": 630, "87": 151, "88": 240, "89": 455, "90": 370,
  "91": 585, "92": 325, "93": 265, "94": 190, "95": 135, "96": 815, "97": 420, "98": 205, "99": 430, "100": 430
}

def round_nearest_10(val):
    rounded_int = round(val)
    remainder = rounded_int % 10
    if remainder >= 5:
        return rounded_int + (10 - remainder)
    else:
        return rounded_int - remainder

rounded_amounts = {}
for k, v in text_table.items():
    rounded_amounts[k] = round_nearest_10(v)

original_sum = sum(text_table.values())
rounded_sum = sum(rounded_amounts.values())

print(f"Original Sum: {original_sum}")
print(f"Rounded Sum: {rounded_sum}")

# Let's print the sorted items to verify
sorted_items = sorted(rounded_amounts.items(), key=lambda item: item[1], reverse=True)
print("Top 5 items in cutting:")
for k, v in sorted_items[:5]:
    print(f"{k} = {v}")
