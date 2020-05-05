import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from 'homebridge';

//@ts-ignore
import BreezartClient from '../lib/breezart-client';

const PLUGIN_NAME = 'homebridge-breezart-fan';
const ACCESSORY_NAME = 'FanSwitch';

let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, FanSwitch);
};

class FanSwitch implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly name: string;
  private readonly fanIP: string;
  private readonly fanPassword: string;
  private fakeFanSpeed: number;
  // private switchOn = false;

  private connectionReady: boolean;

  private readonly fanService: Service;
  private readonly informationService: Service;
  private readonly breezartClient: BreezartClient;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;

    this.fanIP = config.ip;
    this.fanPassword = config.password;

    this.fakeFanSpeed = 50;

    this.connectionReady = false;
    this.breezartClient = new BreezartClient({
      ip: this.fanIP,
      password: this.fanPassword,
    });
    this.breezartClient.connect();
    this.breezartClient.getProperties(() => {
      this.connectionReady = true;
      // this.breezartClient.disconnect();
    });

    this.fanService = new hap.Service.Fan(this.name);

    this.fanService
      .getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, this.getPowerState.bind(this))
      .on(CharacteristicEventTypes.SET, this.setPowerState.bind(this));

    this.fanService
      .getCharacteristic(hap.Characteristic.RotationSpeed)
      .on(CharacteristicEventTypes.GET, this.getRotationSpeed.bind(this))
      .on(CharacteristicEventTypes.SET, this.setRotationSpeed.bind(this));

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Breezart')
      .setCharacteristic(hap.Characteristic.Model, 'Breezart Fan');

    log.info('Switch finished initializing!');
  }

  getPowerState(callback: CharacteristicGetCallback) {
    if (!this.connectionReady) {
      // Returns false wile connaction is not ready
      callback(undefined, false);
      return;
    }
    this.breezartClient.getStatus((error: Error) => {
      if (error) {
        callback(error);
        return;
      }
      const fanState = this.breezartClient.UnitState;
      const powerOn = fanState === 1 || fanState === 3;
      this.log.info(
        'Current state of the fan switch was returned: ' + fanState
      );
      callback(undefined, powerOn);
    });
  }

  setPowerState(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback
  ) {
    if (!this.connectionReady) {
      callback();
      return;
    }
    this.breezartClient.setPower(value, (error: Error) => {
      if (error) {
        callback(error);
        return;
      }
      this.log.info('Set state of the fas switch: ' + value);
      callback();
    });
  }

  getRotationSpeed(callback: CharacteristicGetCallback) {
    this.log.info(
      'Current state of the rotation speed was returned: ' + this.fakeFanSpeed
    );
    callback(undefined, this.fakeFanSpeed);
  }

  setRotationSpeed(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback
  ) {
    this.fakeFanSpeed = value as number;
    this.log.info('Switch state was set to: ' + this.fakeFanSpeed);
    callback();
  }
  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log('Identify fan switch');
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [this.informationService, this.fanService];
  }
}
