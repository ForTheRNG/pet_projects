#include "platforms.h"

int main(int argc, char* argv[]) {
    #if _WIN32
        return windows();
    #elif __linux__
        return linux();
    #elif
        printf("Platform not supported. Oof. \n");
        return 0;
    #endif
}