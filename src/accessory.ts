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
  private readonly fanMinSpeed: number;
  private readonly fanMaxSpeed: number;
  private readonly fanSpeedUnitsCount: number;

  private connectionReady: boolean = false;

  private readonly fanService: Service;
  private readonly informationService: Service;
  private readonly breezartClient: BreezartClient;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;

    this.fanIP = config.ip;
    this.fanPassword = config.password;

    this.fanMinSpeed = config.minSpeed;
    this.fanMaxSpeed = config.maxSpeed;
    this.fanSpeedUnitsCount = config.maxSpeed - config.minSpeed;
    this.breezartClient = new BreezartClient({
      ip: this.fanIP,
      password: this.fanPassword,
    });

    this.breezartClient.connect();
    this.breezartClient.getProperties(() => {
      this.connectionReady = true;
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
      // Returns false while connection is not ready
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
    if (!this.connectionReady) {
      // Returns 0 while connection is not ready
      callback(undefined, 0);
      return;
    }
    this.breezartClient.getStatus((error: Error) => {
      if (error) {
        callback(error);
        return;
      }
      const speed = this.mapSpeedUnitsToPercent(this.breezartClient.Speed);
      this.log.info('Current state of the fan switch was returned: ' + speed);
      callback(undefined, speed);
    });
  }

  setRotationSpeed(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback
  ) {
    if (!this.connectionReady) {
      callback();
      return;
    }
    const speedValue = this.mapPercentToSpeedUnits(value as number);
    this.breezartClient.setRotationSpeed(speedValue, (error: Error) => {
      if (error) {
        callback(error);
        return;
      }
      this.log.info('Rotate speed was set to: ' + speedValue);
      callback();
    });
  }

  mapSpeedUnitsToPercent(value: number): number {
    const minValue = this.fanMinSpeed;
    const unitsCount = this.fanSpeedUnitsCount;
    return Math.ceil(((value - minValue) / unitsCount) * 100);
  }

  mapPercentToSpeedUnits(value: number): number {
    const minValue = this.fanMinSpeed;
    const unitsCount = this.fanSpeedUnitsCount;
    return Math.ceil((unitsCount * value) / 100) + minValue;
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
