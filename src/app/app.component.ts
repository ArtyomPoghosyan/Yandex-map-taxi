import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs';
import { io } from "socket.io-client";
import * as $ from "jquery";

declare var ymaps: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Yandex';

  public myPlacemark: any;
  public currentPlaceLocation: any;
  public searchData: any;
  public coordinates: any;
  public myMap: any;
  public mySearchControl: any;
  public currentPlace: any
  public detectMyCurrentPlaceLocaion: [] = []
  public from: any
  public from_location: {} = {}
  public to: any;
  public to_location: {} = {};
  public control: any;
  public getDistanceTime: any;
  public multiRoutePromise: any;
  public socket: any;
  public socketObj = {}
  public gettrip: any = []
  public currentlocation: any;
  public address: any
  public mobilelog: any = {}
  public gg:any

  constructor() {
    this._inItYandexMap = this._inItYandexMap.bind(this);

  }

  public ngOnInit(): void {

    ymaps.ready(this._inItYandexMap);
    this.lifeGeoLocation();
    this.watchPosition();
    this.socketConnectionOnMessage();

  }

  public socketConnectionOnMessage(): void {
    this.socket = io("ws://localhost:80");
    this.socket.on("onMessage", (arg: any) => {
      console.log(arg)
    })
  }

  public lifeGeoLocation(): void {
    if (!navigator.geolocation) {
      alert("location is not supported")
    }
    navigator.geolocation.getCurrentPosition((position) => { })
  }

  public watchPosition(): void {
    let desLat = 0;
    let desLot = 0;
    let id = navigator.geolocation.watchPosition((position) => {
      let latitude = position.coords.latitude
      let longitude = position.coords.longitude
      this.mobilelog = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }
      var geolocationss = [latitude, longitude]

      // var myReverseGeocoder = ymaps.geocode(geolocation);
      // console.log(myReverseGeocoder._value.geoObjects)
      ymaps.geocode([latitude, longitude]).then((res: any) => {
        console.log(res.geoObjects?.get(0).properties._data.text)
        let geoAddress = res.geoObjects?.get(0).properties._data.text 
        console.log(geoAddress)     
        this.control?.routePanel?.state.set({
          fromEnabled: true,
          from:geoAddress,
          type: "auto"
        })
      })

      if (this.myPlacemark) {
        ymaps.geocode(geolocationss).then((res: any) => {
          console.log(res.geoObjects?.get(0).properties._data.text)
          let geoAddress = res.geoObjects?.get(0).properties._data.text 
          console.log(geoAddress)   
          this.gg=  geoAddress
          console.log(this.gg)
          this.control?.routePanel?.state.set({
            fromEnabled: false,
            from:geoAddress,
            type: "auto"
          })
        })
        
        this.myPlacemark?.geometry.setCoordinates(geolocationss);
        console.log(geolocationss)
        ymaps.Placemark(geolocationss)
        // this.myPlacemark.events.add('locationchange', (e: any) => {
        //   console.log(e)
        // })
        // this.myMap.controls.add()
        // this.control.routePanel.state.set({
        //   from: this.from,
        // })
      } else {
        this.myPlacemark = this._createPlacemark(geolocationss);
        this.myMap.setCenter(geolocationss);
        this.myMap.geoObjects.add(this.myPlacemark);
        this.myPlacemark.events.add('dragend', () => {
          this._getAddress(this.myPlacemark.geometry.getCoordinates());
        });
      }
      this._getAddress(geolocationss);
      if (position.coords.latitude == desLat) {
        navigator.geolocation.clearWatch(id);
      }
    }, (error) => {
      console.log(error)
    }, {
      enableHighAccuracy: true,
      timeout: 100,
      maximumAge: 0
    })
  }

  private _inItYandexMap(): void {
    let latitudes = this.mobilelog.latitude;
    let longitudes = this.mobilelog.longitude;

    // CONNECTION TO MAP
    var geolocation = ymaps.geolocation;
    this.myMap = new ymaps.Map('information_map', {
      center: [this.mobilelog],
      zoom: 9,
      controls: ["routePanelControl"]
    }, {
      searchControlProvider: 'yandex#search'
    })
    this.control = this.myMap.controls.get('routePanelControl');
    this.multiRoutePromise = this.control.routePanel.getRouteAsync();

    //Get My current Location BUTTON
    var geolocationControl = new ymaps.control.GeolocationControl({
      data: { content: 'Определить местоположение', image: 'none' },
      options: { noPlacemark: true, maxWidth: [30, 100, 250], position: { left: 150, top: 650 } }
    });
    console.log(geolocationControl)
    this.myMap.controls.add(geolocationControl);
    geolocationControl.events.add('locationchange', (e: any) => {
      let latitude = this.mobilelog.latitude;
      let longitude = this.mobilelog.longitude;
      this._addMarker({ latitude, longitude });
      this.currentlocation = { latitude, longitude }
      this.myMap.panTo([latitude, longitude]);
      this.detectMyCurrentPlaceLocaion = e.get('position')
      ymaps.geocode(this.detectMyCurrentPlaceLocaion).then((res: any) => {
        console.log(res.geoObjects, "555555555")
        this.from = res.geoObjects.get(0).properties._data.text;
        this.from_location = {
          form: this.from,
          latitude,
          longitude
        }
        this.gettrip = [...this.gettrip, this.from_location]
        // this.socket.emit("location", {
        //   from: {
        //     form: this.from,
        //     latitude,
        //     longitude
        //   }
        // })
        // this.control.routePanel.state.set({
        //   from: this.from,
        // })
      })
    });

    // Get GeoCoordinates where clicked

    this.myMap.events.add('click', (e: any) => {
      const [latitude, longitude] = e.get('coords');
      console.log(latitude)
      this._placemark(e.get('coords'))
      ymaps.geocode(e.get('coords')).then((res: any) => {
        this.to = res.geoObjects.get(0).properties._data.text
        this.control.routePanel.state.set({
          to: this.to
        })
        this.to_location = {
          to: this.to,
          latitude,
          longitude
        }
        this.gettrip = [...this.gettrip, this.to_location]

        // this.socket.emit("location", {
        //   to: {
        //     to: this.to,
        //     latitude,
        //     longitude
        //   }
        // })
      })
    })
    if (!this.myPlacemark) {
    }
    else {
      this.myMap.geoObjects.add(this.myPlacemark)
    }

    let self = this;
    this.multiRoutePromise.then(function (multiRoute: any) {
      let distance: any;
      let duration: any;

      multiRoute.model.events.add('requestsuccess', function () {
        let activeRoute = multiRoute.getActiveRoute();

        if (activeRoute) {
          let road: {}
          distance = activeRoute.properties.get("distance").text;
          duration = activeRoute.properties.get("duration").text
          road = {
            distance,
            duration
          }
          self.gettrip = [...self.gettrip, road]
          let tripData = self.gettrip
          // self.socket.emit("location", {
          // tripData
          // })
          console.log(tripData)

        }
      });
    }, (err: any) => {
      console.log(err);
    })

    // Get geoLocation via Browser
    geolocation.get({
      provider: 'browser',
      mapStateAutoApply: true
    }).then((result: any) => {
      var userAddress = result.geoObjects.get(0).properties.get('text');
      var userCoodinates = result.geoObjects.get(0).geometry.getCoordinates();
      console.log(result);
      console.log(userAddress);
      console.log(userCoodinates);

      result.geoObjects.options.set('preset', 'islands#blueCircleIcon');
      console.log(result.geoObjects)
      this.myMap.geoObjects.add(result.geoObjects)
    })
    self.socket.emit("location", {

    })
  }

  private _placemark(coords: any) {
    this.myPlacemark = new ymaps.Placemark(coords), {
    }
    console.log(this.myPlacemark);

    this.myMap.geoObjects.add(this.myPlacemark)
    this.currentPlace = coords
    var placemark = new ymaps.Placemark(this.currentPlace, {
      iconCaption: 'searching...'
    }, {
      draggable: true,
      iconLayout: 'default#imageWithContent',
      iconImageHref: './assets/img/car.png',
      iconImageSize: [42, 54],
      iconImageOffset: [-20, -50,],
      iconContentOffset: [15, 15],
    })
    console.log(placemark);

    return placemark;
  }

  private _addMarker(coordinates: { latitude: number, longitude: number }): void {
    const { latitude, longitude } = coordinates;
    this.coordinates = [latitude, longitude]
    const coords = [latitude, longitude];

    if (this.myPlacemark) {
      this.myPlacemark.geometry.setCoordinates(coords);
    } else {
      this.myPlacemark = this._createPlacemark(coords);
      this.myMap.setCenter(coords);
      this.myMap.geoObjects.add(this.myPlacemark);
      // this.myPlacemark.events.add('dragend', () => {
      //   this._getAddress(this.myPlacemark.geometry.getCoordinates());
      // });
    }
    // this._getAddress(coords);
  }

  private _createPlacemark(coords: any) {
    return this._placemark(coords)
  }

  private _getAddress(coords: any) {
    this.myPlacemark.properties.set('iconCaption', 'searching...');
    ymaps.geocode(coords).then((res: any) => {
      var firstGeoObject = res.geoObjects.get(0);
      this.myPlacemark.properties
        .set({
          iconCaption: [
            firstGeoObject.getLocalities().length ? firstGeoObject.getLocalities() : firstGeoObject.getAdministrativeAreas(),
            firstGeoObject.getThoroughfare() || firstGeoObject.getPremise()
          ].filter(Boolean).join(', '),
          balloonContent: firstGeoObject.getAddressLine()
        });
    });
  }


}
