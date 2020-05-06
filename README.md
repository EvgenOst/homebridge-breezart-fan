# Breezart Fan Accessory

Homebridge plugin for breezart fan. Allows controlling the Breezart Fan by sending requests via TCP protocol.

## Installation

Install homebridge and this plugin

```
[sudo] npm install -g --unsafe-perm homebridge
[sudo] npm install -g --unsafe-perm homebridge-breezart-fan
```

Example config.json:

    {
      "accessories": [
        {
          "accessory": "FanSwitch",
          "name": "My breezart fan",
          "ip": "127.0.0.1",
          "password": 5473,
          "minSpeed": 0,
          "maxSpeed": 10
        }
      ]
    }
