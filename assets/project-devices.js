/* Which device each project lives on, in the 3D room and the flat view
   alike. A project missing here still gets a steady device of its own. */
window.PROJECT_DEVICE = {
  'Movy': 'phone',
  'BingBang': 'pet',
  'Sequence': 'digicam',
  'Tackie': 'candy',
  'Bubbly': 'pager',
  'Daypond': 'handheld',
  'Finwords': 'learner',
  'SaberOS': 'macintosh',
  'Wallpapers': 'imac',
  'Bug Explorer': 'widehandheld',
  'Koi Pond': 'watch',
  'Archer Travel': 'laptop',
  'Cards of Answers': 'arcade',
  'Axiom Thoughts': 'typewriter',
  'Agent Terrarium': 'scope',
  'JSON Prompts': 'term',
  'Between Floors': 'ereader',
  'Atticus': 'pda',
  'Postcards from Mars': 'flip',
  'Axel Art': 'crt',
  'Littlebook': 'dualscreen',
  'Movie Oracle': 'camcorder',
  'Movy Reel': 'tv',
  'Artuzzle': 'clockradio',
  'Pixel Dailies': 'calculator',
  'Photography': 'musicplayer'
};

/* Roughly how big each thing is in real life, in centimetres, along its
   longest side. Both views size devices from this, squeezed (SIZE_SQUEEZE) so
   a TV is clearly bigger than a pager without being ten times bigger.
   A device missing here is treated as MID_CM. */
window.DEVICE_REAL_CM = {
  watch: 4, pet: 5, pager: 6, flip: 10, digicam: 10, pda: 12, candy: 12, musicplayer: 12,
  dualscreen: 14, widehandheld: 14, cdplayer: 14, rangefinder: 14,
  handheld: 15, phone: 15, calculator: 15, camera: 15, printer: 15, gingerbread: 15, crystalball: 15, foldphone: 15,
  ereader: 17, camcorder: 20, radio: 20, headset: 20, clockradio: 25, console: 27, tablet: 28,
  learner: 30, present: 30, robotdog: 30, teddy: 30, snowman: 26, laptop: 33, macintosh: 35, scope: 35,
  crt: 40, imac: 40, lamp: 40, vinyl: 42, typewriter: 45, cassette: 45, term: 50, tv: 50, arcade: 170
};
window.DEVICE_SIZE = { MID_CM: 20, SQUEEZE: 0.28 };

// How big a device should look, relative to a middle-sized one (1).
window.deviceSizeFactor = function (id) {
  var cm = window.DEVICE_REAL_CM[id] || window.DEVICE_SIZE.MID_CM;
  return Math.pow(cm / window.DEVICE_SIZE.MID_CM, window.DEVICE_SIZE.SQUEEZE);
};
