Project inspired from https://github.com/titarenko/photo

The main goal of the project was to organise all the pictures spread over one or more network drives into a single
local location on the users computer with 3 goals in mind:

  1) pictures have to be organised by date taken
  2) local used space should be minimal
  3) browsing pictures should be fast regardless of the network speed

Install once.

```bash
npm i photosorganiser -g
```

Use forever.

```bash
photosorganiser sourceFolder targetFolder
```

Get a structured library (/year/month/) in the target folder having:
1) shortcut to original picture => labeled as D(day)#hour-minutes-seconds-camera.
2) miniature picture 200x150 pixels (+/- 6kb) of the original picture => labeled as D(day)#hour-minutes-seconds-camera.
3) log file in csv format for each launch of the script
