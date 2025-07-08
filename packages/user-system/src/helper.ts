export function getPastelHexFromUsername(username) {
    // Hash the username to a number
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use hash to get hue in [0, 360)
    const hue = Math.abs(hash) % 360;
    const saturation = 0.6; // 60%
    const lightness = 0.8;  // 80%

    // Convert HSL to RGB
    const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = lightness - c / 2;

    let r = 0, g = 0, b = 0;
    if (hue < 60) [r, g, b] = [c, x, 0];
    else if (hue < 120) [r, g, b] = [x, c, 0];
    else if (hue < 180) [r, g, b] = [0, c, x];
    else if (hue < 240) [r, g, b] = [0, x, c];
    else if (hue < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    // Convert RGB to [0, 255] and to hex
    const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getRandomAnimal(seed) {
    const animals = [
        'Dog', 'Cat', 'Elephant', 'Giraffe', 'Lion', 'Tiger', 'Zebra',
        'Penguin', 'Kangaroo', 'Panda', 'Koala', 'Fox', 'Wolf', 'Rabbit',
        'Monkey', 'Dolphin', 'Whale', 'Cheetah', 'Bear', 'Otter'
    ];

    // Simple LCG for seedable randomness
    function seededRandom(s) {
        const a = 1664525;
        const c = 1013904223;
        const m = 2 ** 32;
        s = (a * s + c) % m;
        return s / m;
    }

    const numSeed = typeof seed === 'string'
        ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        : seed;

    const rand = seededRandom(numSeed);
    const index = Math.floor(rand * animals.length);
    return animals[index];
}