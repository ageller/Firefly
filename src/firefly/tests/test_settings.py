from ..data_reader.settings import Settings
import os
import pytest

default_settings_json = os.path.abspath(os.path.join(
    os.path.dirname(__file__),"..","static","js","misc","DefaultSettings.json"
))
default_particle_settings_json = os.path.abspath(os.path.join(
    os.path.dirname(__file__),"..","static","js","misc","DefaultParticleSettings.json"
))

def test_init():
    """ Test syntax errors and importing. """
    settings = Settings()

def test_load_settings(settings=None):
    if settings is None: settings = Settings()

    assert "title" not in settings.keys()
    settings.loadFromJSON(default_settings_json)
    assert settings["title"] == 'Firefly'
    return settings

def test_load_particle_settings(settings=None):
    if settings is None: settings = Settings()
    assert "partsSizeMultipliers" not in settings.keys()
    settings.loadFromJSON(default_particle_settings_json)
    assert settings["partsSizeMultipliers"] == 1
    return settings

def test_append_load_settings():
    settings = test_load_particle_settings(test_load_settings())
    assert settings["title"] == 'Firefly'
    assert settings["partsSizeMultipliers"] == 1

def test_typecatcher():
    settings = test_load_settings()
    try: settings['title']=5
    except TypeError: pass

def test_keycatcher():
    settings = Settings()
    try: settings['foobar'] = 'hello'
    except KeyError as e: 
        if e.args[0] == "Invalid settings key: 'foobar' (did you mean 'loaded'?)": pass
        else: raise e